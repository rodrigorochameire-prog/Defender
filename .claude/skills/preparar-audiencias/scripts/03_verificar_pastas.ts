/**
 * Verifica se cada assistido da pauta tem pasta no Drive.
 * Para os que não têm, cria a pasta-base. Para os que têm, lista os autos
 * digitais já baixados e flagga os que precisam ser scrapeados.
 *
 * Uso:
 *   npx tsx .claude/skills-cowork/preparar-audiencias/scripts/03_verificar_pastas.ts 2026-05-05
 */
import * as fs from "fs";
import * as path from "path";

const dia = process.argv[2];
if (!dia) { console.error("Uso: ... 03_verificar_pastas.ts <YYYY-MM-DD>"); process.exit(1); }

const DRIVE_BASE = "/Users/rodrigorochameire/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/1 - Defensoria 9ª DP";
const ATRIBUICAO_DIR: Record<string, string> = {
  VVD_CAMACARI: "3 - Casos/Processos - VVD (Criminal)",
  JURI_CAMACARI: "3 - Casos/Processos - Júri",
  GRUPO_JURI: "7 - Júri/Processos - Grupo do juri",
  EXECUCAO_PENAL: "3 - Casos/Processos - Execução Penal",
  SUBSTITUICAO: "3 - Casos/Processos - Substituição criminal",
  SUBSTITUICAO_CIVEL: "3 - Casos/Processos - Substituição cível",
};

const pauta = JSON.parse(fs.readFileSync(`/tmp/pauta-${dia}.json`, "utf8"));

/** Normaliza nome para matching fuzzy: sem acento + lower + trim. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Busca pasta existente por matching fuzzy (sem acento). Procura também em
 * outras atribuições (caso o assistido tenha sido reclassificado).
 * Retorna o caminho EXISTENTE encontrado, ou null.
 */
function findExistingFolder(nomeAssistido: string): string | null {
  const target = normalize(nomeAssistido);
  for (const dirAtrib of Object.values(ATRIBUICAO_DIR)) {
    const base = path.join(DRIVE_BASE, dirAtrib);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base)) {
      if (normalize(entry) === target) {
        return path.join(base, entry);
      }
    }
  }
  return null;
}

const relatorio: any[] = [];

for (const a of pauta.audiencias) {
  const dirAtrib = ATRIBUICAO_DIR[a.atribuicao] || "3 - Casos/Processos";

  // 1) Tentar match fuzzy primeiro (em qualquer atribuição)
  let baseAssistido = findExistingFolder(a.assistido_nome);
  let pasta_match_fuzzy = false;
  if (baseAssistido) {
    pasta_match_fuzzy = true;
  } else {
    baseAssistido = path.join(DRIVE_BASE, dirAtrib, a.assistido_nome);
  }

  const dirAutos = path.join(baseAssistido, a.numero_autos);
  const pdfAutos = path.join(dirAutos, `Autos Digitais - ${a.numero_autos}.pdf`);

  let acao: "ok" | "criar_dir" | "criar_pasta_assistido" | "scraping_pendente" = "ok";
  if (!fs.existsSync(baseAssistido)) acao = "criar_pasta_assistido";
  else if (!fs.existsSync(dirAutos)) acao = "criar_dir";
  else if (!fs.existsSync(pdfAutos)) acao = "scraping_pendente";

  if (acao === "criar_pasta_assistido" || acao === "criar_dir") {
    fs.mkdirSync(dirAutos, { recursive: true });
    console.log(`[+] criada pasta: ${dirAutos}`);
  } else if (pasta_match_fuzzy) {
    console.log(`[~] pasta existente reutilizada (match fuzzy): ${baseAssistido}`);
  }

  // Conferir documentos relevantes existentes
  const arquivos: string[] = [];
  if (fs.existsSync(dirAutos)) {
    for (const f of fs.readdirSync(dirAutos)) {
      if (f === "Icon" || f.startsWith(".")) continue;
      arquivos.push(f);
    }
  }

  relatorio.push({
    id: a.id,
    nome: a.assistido_nome,
    numero_autos: a.numero_autos,
    atribuicao: a.atribuicao,
    pasta_assistido: baseAssistido,
    pasta_autos: dirAutos,
    pdf_autos_existe: fs.existsSync(pdfAutos),
    pasta_match_fuzzy,
    acao_proxima: acao,
    arquivos_encontrados: arquivos,
  });
}

const outPath = `/tmp/pastas-${dia}.json`;
fs.writeFileSync(outPath, JSON.stringify(relatorio, null, 2));

console.log(`\n=== Resumo ${dia} ===`);
const cnt: Record<string, number> = {};
for (const r of relatorio) cnt[r.acao_proxima] = (cnt[r.acao_proxima] ?? 0) + 1;
for (const [k, v] of Object.entries(cnt)) console.log(`  ${k}: ${v}`);
console.log(`\nDetalhe → ${outPath}`);
